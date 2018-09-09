#!/usr/bin/env python3

#################################################
# Author: Muuo Wambua                           #
# Note: This has only been tested with Python 3 #
# License: MIT                                  #
#################################################
##################################################################################
# Copyright (c) 2018 Muuo Wambua                                                 #
#                                                                                #
# Permission is hereby granted, free of charge, to any person obtaining a copy   #
# of this software and associated documentation files (the "Software"), to deal  #
# in the Software without restriction, including without limitation the rights   #
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell      #
# copies of the Software, and to permit persons to whom the Software is          #
# furnished to do so, subject to the following conditions:                       #
#                                                                                #
# The above copyright notice and this permission notice shall be included in all #
# copies or substantial portions of the Software.                                #
#                                                                                #
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR     #
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,       #
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE    #
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER         #
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  #
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE  #
# SOFTWARE.                                                                      #
##################################################################################

from subprocess import call
import argparse, sys, os
import json

# Change this if your features change!
modelTemplate = {
  "store" : "myfeature_store",
  "name" : "mymodel",
  "class" : "org.apache.solr.ltr.model.LinearModel",
  "features" : [
    { "name" : "originalScore" },
    { "name" : "titleLength" },
    { "name" : "contentLength" },
    { "name" : "titleScore" },
    { "name" : "contentScore" },
    { "name" : "freshness" }
  ],
  "params" : {
    "weights" : {
      "originalScore" : 0.0,
      "titleLength" : 0.0,
      "contentLength" : 0.0,
      "titleScore" : 0.0,
      "contentScore" : 0.0,
      "freshness" : 0.0
    }
  }
}

def main(svmDir, trainingFile, modelFile):
    regen = True
    if os.path.isfile("model"):
        print("A model file already exists.\nDo you want to overwrite it? [N/y]", file=sys.stderr)
        yn = input()
        if (yn.lower() != "y"):
            regen = False
    if regen:
        call(["%s/svm_rank_learn" % svmDir, "-c", "3", trainingFile, "model"], stdout=sys.stderr)

    # Read in the parameters from the generated model file
    params = None
    with open("model") as fmodel:
        lines = fmodel.read().split("\n")
        # We only really care about the last line
        for lineNo in range(-1, -len(lines)-1, -1):
            param_line = lines[lineNo]
            if param_line:
                break
        param_line = param_line.split()
        params = [p.split(":")[1] for p in param_line if ":" in p]

    # Plug the parameters into our template
    model = modelTemplate
    for i in range(len(model["features"])):
        model["params"]["weights"][model["features"][i]["name"]] = params[i]
    # Save the model save the world
    json.dump(model, modelFile)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Train the SVMRank model for Solr.')
    parser.add_argument('trainingFile', type=argparse.FileType('r'), help="file with training data")
    parser.add_argument('-m', '--modelOutFile', nargs='?', type=argparse.FileType('w+'), help="where to save the Solr compatible model file", default=sys.stdout)
    parser.add_argument('--svmDir', type=str, help="path to directory where we can find the binary svm_rank_learn", default="svm_rank")

    args = parser.parse_args()

    main(args.svmDir, args.trainingFile.name, args.modelOutFile)